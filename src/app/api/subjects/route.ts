import { crudCollection } from "@/lib/crud";
import { subjectResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(subjectResource);
