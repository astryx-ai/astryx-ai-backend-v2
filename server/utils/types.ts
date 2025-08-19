// Define interfaces for status objects
export interface AppStatus {
  status: string;
  time: string;
}

export interface ServiceStatus {
  status: string;
  message?: string;
  details?: any;
}
