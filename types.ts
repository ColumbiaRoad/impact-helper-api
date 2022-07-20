import { ResponseType } from "axios";

export interface DealPayload {
  objectId: number;
  properties: {
    dealname: {
      value: string;
    };
  };
}

export interface Company {
  name: string;
  vatin: string | null;
  isin: string | null;
}

export interface UprightId {
  type: "VATIN" | "ISIN";
  value: string;
}

export interface UprightResponse {
  data: Buffer;
}

export interface GetProfileArgs {
  uprightId: UprightId;
  responseType?: ResponseType;
}
