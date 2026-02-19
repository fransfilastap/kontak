"use server";

import { actionClient } from "@/lib/safe-action";
import { kontakClient } from "@/lib/kontak";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  content: z.string().min(1, "Template content is required"),
  variables: z.array(z.string()).default([]),
});

const updateTemplateSchema = templateSchema.extend({
  id: z.string().min(1, "Template ID is required"),
});

const deleteTemplateSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
});

export const createTemplate = actionClient
  .schema(templateSchema)
  .action(async ({ parsedInput: { name, content, variables } }) => {
    try {
      const response = await kontakClient.createTemplate({
        name,
        content,
        variables,
      });
      return response;
    } catch (error) {
      console.error("Error creating template:", error);
      return { failure: "Failed to create template" };
    }
  });

export const updateTemplate = actionClient
  .schema(updateTemplateSchema)
  .action(async ({ parsedInput: { id, name, content, variables } }) => {
    try {
      const response = await kontakClient.updateTemplate(id, {
        name,
        content,
        variables,
      });
      return response;
    } catch (error) {
      console.error("Error updating template:", error);
      return { failure: "Failed to update template" };
    }
  });

export const deleteTemplate = actionClient
  .schema(deleteTemplateSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const response = await kontakClient.deleteTemplate(id);
      return response;
    } catch (error) {
      console.error("Error deleting template:", error);
      return { failure: "Failed to delete template" };
    }
  });
