export interface Social {
  instagram?: string;
  twitter?: string;
}

export interface Profile {
  medical: {
    age: number;
    fit: boolean;
    testDate: Date;
    nested: {
      test: [Date, Date]
    }
  },
  tests: Array<{ id: number, testDate: Date, result: number }>
}
