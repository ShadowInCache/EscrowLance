import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ce_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get("/auth/profile");
  return data;
};

export const fetchProjects = async () => (await api.get("/projects")).data;
export const fetchProject = async (id) => (await api.get(`/projects/${id}`)).data;
export const createProject = async (payload) => (await api.post("/projects/create", payload)).data;
export const deployProject = async (projectId) => (await api.post(`/projects/${projectId}/deploy`)).data;
export const deleteProject = async (projectId) => (await api.delete(`/projects/${projectId}`)).data;
export const assignFreelancerApi = async (projectId, payload) => (await api.post(`/projects/${projectId}/assign`, payload)).data;
export const submitMilestone = async (payload) => (await api.post("/milestones/submit", payload)).data;
export const approveMilestone = async (payload) => (await api.post("/milestones/approve", payload)).data;
export const listMilestones = async (projectId) => (await api.get(`/milestones/project/${projectId}`)).data;
export const listTransactions = async () => (await api.get("/transactions")).data;
export const listProjectTransactions = async (projectId) => (await api.get(`/transactions`, { params: { projectId } })).data;
export const raiseDispute = async (payload) => (await api.post("/disputes/create", payload)).data;
export const resolveDispute = async (payload) => (await api.post("/disputes/resolve", payload)).data;
export const listDisputes = async () => (await api.get("/disputes")).data;
export const addDisputeComment = async (id, payload) => (await api.post(`/disputes/${id}/comment`, payload)).data;
export const addDisputeEvidence = async (id, payload) => (await api.post(`/disputes/${id}/evidence`, payload)).data;
export const listFreelancers = async () => (await api.get("/users/freelancers")).data;
export const uploadProofFile = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export default api;
