export interface User {
  id: number;
  name: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}
