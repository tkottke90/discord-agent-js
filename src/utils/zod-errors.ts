import { ZodError } from "zod";


export function prettyZodErrors(error: ZodError | undefined) {
  if (!error) return;
  
  return error.issues.map((issue, index: number) => {
    return `${index + 1}. $.${issue.path.join('.')} - [${issue.code}] ${issue.message}`;
  });
}