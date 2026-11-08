import { crudCollection } from "@/lib/crud";
import { eventResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(eventResource);
