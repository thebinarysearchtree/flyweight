export interface Social {
  instagram?: string;
  twitter?: string;
}

export interface Profile {
  medical: {
    age: number;
    fit: boolean;
    testDate: Date;
  },
  tests: Array<{ id: number, testDate: Date, result: number }>
}
