import { crudItem } from "@/lib/crud";
import { hostelResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(hostelResource);
