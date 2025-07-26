import axios from "axios";
import { backendURL } from "./variables";

axios.defaults.baseURL = backendURL;
axios.defaults.withCredentials = true;
