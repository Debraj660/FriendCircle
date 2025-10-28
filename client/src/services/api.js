import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';
const instance = axios.create({ baseURL: API_BASE });

function setToken(token) {
  if (token) instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete instance.defaults.headers.common['Authorization'];
}

instance.setToken = setToken;

export default instance;
