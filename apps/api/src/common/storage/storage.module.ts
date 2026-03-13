import { Global, Module } from "@nestjs/common";

import { OBJECT_STORAGE } from "./storage.constants";
import { MinioStorageService } from "./minio-storage.service";

@Global()
@Module({
  providers: [
    MinioStorageService,
    {
      provide: OBJECT_STORAGE,
      useExisting: MinioStorageService
    }
  ],
  exports: [OBJECT_STORAGE, MinioStorageService]
})
export class StorageModule {}
