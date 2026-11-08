import { crudCollection } from "@/lib/crud";
import { studentResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(studentResource);
