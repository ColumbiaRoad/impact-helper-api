import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import { getDealCompanies } from "./hubspot/deal";
import { getCompany } from "./hubspot/company";
import { DealPayload, Company } from "../../types";

interface UprightId {
  type: "VATIN" | "ISIN";
  value: string;
}

const getDeals = async (_request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  return "GET deals";
};

const postDeal = async (request: Hapi.Request, _h: Hapi.ResponseToolkit) => {
  const payload = request.payload as DealPayload;
  const objectId = payload.objectId || NaN;

  const companyIds = await getDealCompanies(objectId);

  const uprightIds: UprightId[] = [];

  for (let i = 0; i < companyIds.length; i++) {
    const company = await getCompany(companyIds[i]);
    const uprightId = getUprightId(company);

    uprightId && uprightIds.push(uprightId);
  }
  return { uprightIds };
};

export { getDeals, postDeal };

const getUprightId = (company: Company): UprightId | void => {
  if (company.vatin) {
    return { type: "VATIN", value: company.vatin };
  } else if (company.isin) {
    return { type: "ISIN", value: company.isin };
  } else {
    Boom.notFound("VATIN / ISIN not found");
  }
};