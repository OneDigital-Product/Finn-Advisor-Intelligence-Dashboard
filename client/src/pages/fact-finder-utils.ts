export function evaluateCondition(
  condition: string,
  answers: Record<string, any>
): boolean {
  try {
    const parts = condition.split(/\s*(===|!==|==|!=|>=|<=|>|<)\s*/);
    if (parts.length === 3) {
      const [field, op, rawVal] = parts;
      const actual = answers[field];
      let expected: any = rawVal.replace(/['"]/g, "");
      if (expected === "true") expected = true;
      else if (expected === "false") expected = false;
      else if (!isNaN(Number(expected))) expected = Number(expected);

      switch (op) {
        case "===":
        case "==":
          return actual == expected;
        case "!==":
        case "!=":
          return actual != expected;
        case ">":
          return Number(actual) > Number(expected);
        case "<":
          return Number(actual) < Number(expected);
        case ">=":
          return Number(actual) >= Number(expected);
        case "<=":
          return Number(actual) <= Number(expected);
      }
    }
    return true;
  } catch {
    return true;
  }
}
