"use client";

import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { Input } from "@/components/ui/input";

type NominalInputProps = NumericFormatProps;

export function NominalInput(props: NominalInputProps) {
  return (
    <NumericFormat
      {...props}
      customInput={Input}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={0}
      allowNegative={false}
      inputMode="numeric"
      placeholder="0"
    />
  );
}
