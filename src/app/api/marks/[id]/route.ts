import { crudItem } from "@/lib/crud";
import { markResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(markResource);
