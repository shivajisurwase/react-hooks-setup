import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import moment from 'moment';

const dateTransformer = (data: any): any => {
  if (data instanceof Date) {
    return moment(data).format('YYYY-MM-DDTHH:mm:ssZ');
  }
  if (Array.isArray(data)) {
    return data.map(dateTransformer);
  }
  if (typeof data === 'object' && data !== null) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, dateTransformer(value)]));
  }
  return data;
};

interface AxiosConfigProps {
  baseURL: string;
  callback?: (axiosInstance: AxiosInstance, originalRequest: AxiosRequestConfig) => Promise<AxiosResponse>;
  timeout: number;
}

export const useAxiosAuth = ({ baseURL, callback, timeout }: AxiosConfigProps): AxiosInstance => {
  const axiosInstance = axios.create({
    baseURL,
    timeout,
    transformRequest: [dateTransformer, ...(axios.defaults.transformRequest as any[])],
  });

  axiosInstance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean };
      if (err.response && err.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        if (typeof callback === 'function') {
          return await callback(axiosInstance, originalRequest);
        }
      }
      return Promise.reject(err);
    }
  );
  return axiosInstance;
};

interface AxiosNoAuthConfigProps {
  baseURL: string;
  timeout: number;
}

export const useAxiosNoAuth = ({ baseURL, timeout }: AxiosNoAuthConfigProps): AxiosInstance => {
  const axiosNoAuthInstance = axios.create({
    baseURL,
    timeout,
  });

  axiosNoAuthInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      return Promise.reject((error.response && error.response.data) || { title: 'Something went wrong' });
    }
  );
  return axiosNoAuthInstance;
};

export default { useAxiosAuth, useAxiosNoAuth };
