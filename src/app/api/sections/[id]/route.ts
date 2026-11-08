import { crudItem } from "@/lib/crud";
import { sectionResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(sectionResource);
