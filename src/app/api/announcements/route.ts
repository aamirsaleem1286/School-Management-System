import { crudCollection } from "@/lib/crud";
import { announcementResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(announcementResource);
