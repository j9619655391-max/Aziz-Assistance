import { IAppRepository } from "../shared/repository/IRepository";
import { JobProfile, FreelanceProfile } from "../../types";

export class ProfileService {
  constructor(private repo: IAppRepository) {}

  /**
   * Retrieves the current candidate job profile
   */
  public async getJobProfile(): Promise<JobProfile & { currentRole?: string }> {
    return this.repo.getJobProfile();
  }

  /**
   * Updates fields of the candidate job profile
   */
  public async updateJobProfile(profileUpdates: Partial<JobProfile & { currentRole?: string }>): Promise<JobProfile & { currentRole?: string }> {
    return this.repo.updateJobProfile(profileUpdates);
  }

  /**
   * Retrieves the current freelance consulting profile
   */
  public async getFreelanceProfile(): Promise<FreelanceProfile & { fewShotExamples?: Array<{ id: string; gigTitle: string; pitchText: string; addedAt: string }> }> {
    return this.repo.getFreelanceProfile();
  }

  /**
   * Updates freelance consulting parameters
   */
  public async updateFreelanceProfile(profileUpdates: Partial<FreelanceProfile>): Promise<FreelanceProfile> {
    return this.repo.updateFreelanceProfile(profileUpdates);
  }

  /**
   * Adds a few shot pitch template to freelance profile
   */
  public async addFewShotExample(gigTitle: string, pitchText: string): Promise<any> {
    return this.repo.addFewShotExample({ gigTitle, pitchText });
  }

  /**
   * Deletes a few shot pitch template by ID
   */
  public async deleteFewShotExample(id: string): Promise<boolean> {
    return this.repo.deleteFewShotExample(id);
  }
}

