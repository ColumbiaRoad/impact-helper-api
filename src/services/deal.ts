import Hapi from "@hapi/hapi";
import { getDealCompanies } from "./hubspot/deal";
import { getCompany } from "./hubspot/company";
import { getProfile } from "./upright/profile";
import { uploadImage, postMessage } from "./slack";
import { DealPayload, Company, UprightId, GetProfileArgs } from "../../types";
import config from "../config";

const getDeals = async (_request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  return "GET deals";
};

const postDeal = async (request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  const payload = request.payload as DealPayload;
  const objectId = payload.objectId || NaN;
  const dealname = payload.properties?.dealname?.value || "";
  dealPipeline(objectId, dealname, true);
  return "ok";
};

const postDealPNG = async (request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  const payload = request.payload as DealPayload;
  const objectId = payload.objectId || NaN;
  const dealname = payload.properties?.dealname?.value || "";
  return await dealPipeline(objectId, dealname, false);
};

const dealPipeline = async (
  objectId: number,
  dealname: string,
  slack: boolean
) => {
  const companyIds = await getDealCompanies(objectId);

  if (!companyIds || companyIds.length === 0) {
    await sendError(`Deal ${dealname} has no associated companies`, slack);
    return null;
  }

  for (let i = 0; i < companyIds.length; i++) {
    const companyId = companyIds[i];
    const company = await getCompany(companyId);

    if (!company) {
      await sendError(`No HubSpot Company found for id ${companyId}`, slack);
      continue;
    }

    const uprightId = getUprightId(company);

    if (!uprightId) {
      await sendError(`No VATIN/ISIN assigned to ${company.name}`, slack);
      continue;
    }

    const profileArgs: GetProfileArgs = { uprightId };
    if (!slack) {
      profileArgs.responseType = "stream";
    }
    const profile = await getProfile(profileArgs);

    if (!profile) {
      await sendError(`No Upright profile found for ${company.name}`, slack);
      continue;
    }

    if (slack) {
      const posted = await uploadImage(profile, company.name);

      if (!posted) {
        sendError(
          `Uploading the profile to Slack failed for ${company.name}`,
          slack
        );
      }
    }

    if (!slack && profile) return profile;
  }
  return null;
};

export { getDeals, postDeal, postDealPNG };

const getUprightId = (company: Company): UprightId | null => {
  if (company.vatin) {
    return { type: "VATIN", value: company.vatin };
  } else if (company.isin) {
    return { type: "ISIN", value: company.isin };
  } else {
    return null;
  }
};

async function sendError(message: string, slack: boolean) {
  return slack ? await postErrorMessage(message) : console.log(message);
}

const postErrorMessage = async (text: string) => {
  const channel = config.slackErrorChannel;
  if (!channel) return true; // no actual error happened so worked as expected

  try {
    await postMessage(channel, `:exclamation: Impact bot error: ${text}`);
  } catch (error) {
    console.error(error);
    return false;
  }
  return true;
};
