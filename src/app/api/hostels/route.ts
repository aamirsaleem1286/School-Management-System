import { crudCollection } from "@/lib/crud";
import { hostelResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(hostelResource);
