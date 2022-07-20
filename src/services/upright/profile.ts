import axios from "axios";
import config from "../../config";
import { UprightResponse, GetProfileArgs } from "../../../types";

const getProfile = async ({ uprightId, responseType }: GetProfileArgs) => {
  const route = `${config.uprightApiRoot}/profile`;
  try {
    const response: UprightResponse = await axios.get(route, {
      params: {
        [uprightId.type]: uprightId.value,
        expand: "S,K,H,E",
      },
      headers: {
        Authorization: config.uprightApiToken || false,
      },
      responseType,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export { getProfile };
