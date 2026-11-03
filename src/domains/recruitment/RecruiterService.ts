import { IAppRepository } from "../shared/repository/IRepository";
import { RecruiterContact } from "../../types";

export class RecruiterService {
  constructor(private repo: IAppRepository) {}

  /**
   * Retrieves all recruiter contacts
   */
  public async getContacts(): Promise<RecruiterContact[]> {
    return this.repo.getRecruiterContacts();
  }

  /**
   * Adds a new recruiter contact
   */
  public async addContact(contact: Omit<RecruiterContact, "id" | "dateAdded">): Promise<RecruiterContact> {
    await this.repo.addSystemLog("success", "database", `Added recruiter contact: "${contact.name}" (${contact.company})`);
    return this.repo.addRecruiterContact(contact);
  }

  /**
   * Deletes a recruiter contact by ID
   */
  public async deleteContact(id: string): Promise<boolean> {
    const contacts = await this.repo.getRecruiterContacts();
    const contact = contacts.find(c => c.id === id);
    if (contact) {
      await this.repo.addSystemLog("warn", "database", `Deleted recruiter contact: "${contact.name}" (${contact.company})`);
    }
    return this.repo.deleteRecruiterContact(id);
  }
}

