import { executeHttpRequest } from '@sap-cloud-sdk/http-client';

const S4_BASE_URL = 'https://<your-s4-system>.s4hana.ondemand.com';
const API_PATH = '/sap/opu/odata/sap/API_SERVICE_REQUEST_SRV';

export async function getServiceRequests() {
  try {
    const response = await executeHttpRequest({
      destinationName: 'S4HANA_CLOUD',
      url: `${S4_BASE_URL}${API_PATH}/ServiceRequest`,
      method: 'get'
    });
    return response.data.d.results;
  } catch (error) {
    console.error('Error fetching service requests:', error);
    throw error;
  }
}

export async function createServiceRequest(requestData) {
  try {
    const response = await executeHttpRequest({
      destinationName: 'S4HANA_CLOUD',
      url: `${S4_BASE_URL}${API_PATH}/ServiceRequest`,
      method: 'post',
      data: requestData
    });
    return response.data;
  } catch (error) {
    console.error('Error creating service request:', error);
    throw error;
  }
}