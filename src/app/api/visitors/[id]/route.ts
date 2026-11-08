import { crudItem } from "@/lib/crud";
import { visitorResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(visitorResource);
