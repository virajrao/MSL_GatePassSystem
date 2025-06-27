import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const registerUser = async (userData) => {
  return axios.post(`${API_URL}/register`, userData);
};

export const loginUser = async (credentials) => {
  console.log(credentials)
  return axios.post(`${API_URL}/login`, credentials);
};
export const requisition = async (credentials) => {
  console.log(credentials);
  console.log('Requisition endpoint hit'); 
  try{
    return axios.post(`${API_URL}/requisition`, credentials);
  }
  catch(er){
    console.log('ha ha error');
  }
};