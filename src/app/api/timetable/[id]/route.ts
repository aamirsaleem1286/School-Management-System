import { crudItem } from "@/lib/crud";
import { timetableResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(timetableResource);
