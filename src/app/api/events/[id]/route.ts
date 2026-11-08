import { crudItem } from "@/lib/crud";
import { eventResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(eventResource);
