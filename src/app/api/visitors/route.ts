import { crudCollection } from "@/lib/crud";
import { visitorResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(visitorResource);
