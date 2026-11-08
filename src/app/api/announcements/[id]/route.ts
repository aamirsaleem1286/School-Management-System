import { crudItem } from "@/lib/crud";
import { announcementResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(announcementResource);
