export const retirementFinder = {
  async validate(_signal: any, _advisorId: string) {
    return { valid: true };
  },

  async execute(signal: any, _advisorId: string) {
    return {
      success: true,
      action_taken: "launch_fact_finder",
      navigation: `/fact-finders/retirement?signal_id=${signal.id}`,
      message: "Opening retirement fact finder...",
    };
  },
};

export const businessOwnerFinder = {
  async validate(_signal: any, _advisorId: string) {
    return { valid: true };
  },

  async execute(signal: any, _advisorId: string) {
    return {
      success: true,
      action_taken: "launch_fact_finder",
      navigation: `/fact-finders/business-owner?signal_id=${signal.id}`,
      message: "Opening business owner fact finder...",
    };
  },
};
