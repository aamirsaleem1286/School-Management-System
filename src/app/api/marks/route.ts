import { crudCollection } from "@/lib/crud";
import { markResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(markResource);
