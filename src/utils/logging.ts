import { Console } from "node:console";

export class Logger extends Console {
  constructor() {
    super(
      process.stdout,
      process.stderr,
      false
    );
  }
}