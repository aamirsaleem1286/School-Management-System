import { crudCollection } from "@/lib/crud";
import { sectionResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(sectionResource);
