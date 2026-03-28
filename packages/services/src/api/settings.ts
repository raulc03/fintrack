import type { UserSettings, UpdateSettingsInput } from "@finance/types";
import { apiRequest } from "./client";
import type { ISettingsService } from "../types";

export class ApiSettingsService implements ISettingsService {
  async get(): Promise<UserSettings> {
    return apiRequest<UserSettings>("/api/settings");
  }

  async update(input: UpdateSettingsInput): Promise<UserSettings> {
    return apiRequest<UserSettings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
}
