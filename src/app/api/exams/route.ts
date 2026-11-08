import { crudCollection } from "@/lib/crud";
import { examResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(examResource);
