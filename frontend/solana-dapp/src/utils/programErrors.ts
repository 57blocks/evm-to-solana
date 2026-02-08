export type FormattedError = {
  message: string;
  title?: string;
};

const getMessageFromUnknown = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || "Unknown error";
  }

  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim() !== "") {
      return maybeMessage;
    }
  }

  return "Unknown error";
};

export const formatErrorForDisplay = (error: unknown): FormattedError => {
  const message = getMessageFromUnknown(error);

  if (message.toLowerCase().includes("signature")) {
    return { message, title: "Signature Error" };
  }

  if (message.toLowerCase().includes("transaction")) {
    return { message, title: "Transaction Failed" };
  }

  return { message };
};
