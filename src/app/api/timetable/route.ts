import { crudCollection } from "@/lib/crud";
import { timetableResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(timetableResource);
