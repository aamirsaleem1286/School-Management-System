import { crudCollection } from "@/lib/crud";
import { classResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(classResource);
