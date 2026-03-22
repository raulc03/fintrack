import type {
  Obligation,
  CreateObligationInput,
  UpdateObligationInput,
  ObligationSummary,
} from "@finance/types";
import type { IObligationService } from "../types";
import { apiRequest } from "./client";

export class ApiObligationService implements IObligationService {
  async getAll(): Promise<Obligation[]> {
    return apiRequest<Obligation[]>("/api/obligations");
  }

  async getSummary(): Promise<ObligationSummary[]> {
    return apiRequest<ObligationSummary[]>("/api/obligations/summary");
  }

  async create(input: CreateObligationInput): Promise<Obligation> {
    return apiRequest<Obligation>("/api/obligations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async update(id: string, input: UpdateObligationInput): Promise<Obligation> {
    return apiRequest<Obligation>(`/api/obligations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/obligations/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async link(id: string, movementId: string | null): Promise<Obligation> {
    return apiRequest<Obligation>(`/api/obligations/${encodeURIComponent(id)}/link`, {
      method: "PATCH",
      body: JSON.stringify({ movementId }),
    });
  }

  async togglePaid(id: string, paid: boolean): Promise<Obligation> {
    return apiRequest<Obligation>(`/api/obligations/${encodeURIComponent(id)}/toggle-paid`, {
      method: "PATCH",
      body: JSON.stringify({ manuallyPaid: paid }),
    });
  }
}
