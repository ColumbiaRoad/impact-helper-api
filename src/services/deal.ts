import Hapi from "@hapi/hapi";
import { getDealCompanies } from "./hubspot/deal";
import { getCompany } from "./hubspot/company";
import { getProfile } from "./upright/profile";
import { uploadImage, postMessage } from "./slack";
import { DealPayload, Company, UprightId } from "../../types";
import config from "../config";

const getDeals = async (_request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  return "GET deals";
};

const postDeal = async (request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  const payload = request.payload as DealPayload;
  const objectId = payload.objectId || NaN;
  const dealname = payload.properties?.dealname?.value || "";
  dealPipeline(objectId, dealname);
  return "ok";
};

const dealPipeline = async (objectId: number, dealname: string) => {
  const companyIds = await getDealCompanies(objectId);

  if (!companyIds || companyIds.length === 0) {
    await postErrorMessage(`Deal ${dealname} has no associated companies`);
    return;
  }

  const companyId = companyIds.find((x) => typeof x !== undefined) as string;
  const company = await getCompany(companyId);

  if (!company) {
    await postErrorMessage(`No HubSpot Company found for id ${companyId}`);
    return;
  }

  const uprightId = getUprightId(company);

  if (!uprightId) {
    await postErrorMessage(`No VATIN/ISIN assigned to ${company.name}`);
    return;
  }

  const profile = await getProfile(uprightId);

  if (!profile) {
    await postErrorMessage(`No Upright profile found for ${company.name}`);
    return;
  }

  const posted = await uploadImage(profile, company.name);

  if (!posted) {
    await postErrorMessage(
      `Uploading the profile to Slack failed for ${company.name}`
    );
  }
}

export { getDeals, postDeal };

const getUprightId = (company: Company): UprightId | null => {
  if (company.vatin) {
    return { type: "VATIN", value: company.vatin };
  } else if (company.isin) {
    return { type: "ISIN", value: company.isin };
  } else {
    return null;
  }
};

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
