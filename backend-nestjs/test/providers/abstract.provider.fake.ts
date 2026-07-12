import { NotFoundException } from '@nestjs/common';

interface HasIdAndDates {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export abstract class AbstractProviderFake<T extends HasIdAndDates> {
  protected records: T[] = [];

  protected async getNewId(): Promise<number> {
    let newId: number = 0;

    do {
      newId = Math.floor(Math.random() * 100);

      try {
        await this.findRecord(newId);
      } catch (NotFoundException) {
        return newId;
      }
    } while (1);

    return newId;
  }

  protected async findRecord(id: number, includeDeleted: boolean = false): Promise<T> {
    const existing = this.records.find(
      (record: T) => {
        if (record.id === id) {
          if (!record.deletedAt || includeDeleted) {
            return true;
          }
        }

        return false;
      }
    );

    if (existing) {
      return existing;
    }

    throw new NotFoundException('Record not found');
  }

  protected async createRecord(createDto: Omit<T, 'id'>): Promise<T> {
    const id = await this.getNewId();
    const record = { id: id, ...createDto, createdAt: new Date() } as T;

    this.records.push(record);
    return record;
  }

  protected async updateRecord(record: T, updateDto: Partial<T>): Promise<T> {
    let existingRecord: T | null;

    existingRecord = await this.findRecord(record.id);
    existingRecord = {
      ...existingRecord,
      ...updateDto,
      updatedAt: new Date(),
    };

    return existingRecord;
  }

  protected async deleteRecord(record: T): Promise<void> {
    let existingRecord: T | null;

    existingRecord = await this.findRecord(record.id);
    existingRecord.deletedAt = new Date();

    return;
  }

  clear(): void {
    this.records = [];
  }

  seed(data: T[]): void {
    this.records = data;
  }
}