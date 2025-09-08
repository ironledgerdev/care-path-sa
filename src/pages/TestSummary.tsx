import React from 'react';

const TestSummary: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Test Summary</h1>
      <p className="text-muted-foreground mt-2">Summary of tests and results.</p>
    </div>
  );
};

export default TestSummary;
