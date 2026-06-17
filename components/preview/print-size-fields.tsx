"use client";

import { Ruler } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PREVIEW_BUNDLE_PRINT_SIZE_LIMITS,
  centimetersToInches,
  formatPreviewBundlePrintArea,
  formatPreviewBundlePrintDimensions,
  metersToCentimeters,
  type PreviewBundlePrint,
  type PreviewBundlePrintUnit,
  type PreviewBundlePrintValidationResult,
  validatePreviewBundlePrintDimensions
} from "@/lib/preview-bundle-contract";
import { cn } from "@/lib/utils";

export type PrintSizeFieldsValue = {
  unit: PreviewBundlePrintUnit;
  width: string;
  height: string;
};

export const PRINT_SIZE_FIELD_STEP = "any";

type PrintSizeFieldsProps = {
  value: PrintSizeFieldsValue;
  onChange: (value: PrintSizeFieldsValue) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  validation?: PreviewBundlePrintValidationResult;
  testIdPrefix?: string;
};

function formatInputNumber(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;

  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

export function printSizeFieldsValueFromPrint(print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">, unit: PreviewBundlePrintUnit = "in") {
  if (unit === "in") {
    return {
      unit,
      width: formatInputNumber(centimetersToInches(metersToCentimeters(print.widthMeters))),
      height: formatInputNumber(centimetersToInches(metersToCentimeters(print.heightMeters)))
    };
  }

  return {
    unit,
    width: formatInputNumber(metersToCentimeters(print.widthMeters)),
    height: formatInputNumber(metersToCentimeters(print.heightMeters))
  };
}

export function resolvePrintSizeFieldsValue(value: PrintSizeFieldsValue) {
  return validatePreviewBundlePrintDimensions({
    unit: value.unit,
    width: Number(value.width),
    height: Number(value.height)
  });
}

export function PrintSizeFields({
  value,
  onChange,
  disabled = false,
  title = "Print size",
  description = "Set the physical print size used for the generated wall-placement model.",
  validation,
  testIdPrefix = "print-size"
}: PrintSizeFieldsProps) {
  const currentValidation = validation ?? resolvePrintSizeFieldsValue(value);
  const min = value.unit === "cm" ? PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters : PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minInches;
  const max = value.unit === "cm" ? PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters : PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxInches;
  const unitLabel = value.unit === "cm" ? "centimeters" : "inches";

  const changeUnit = (unit: PreviewBundlePrintUnit) => {
    if (unit === value.unit) {
      return;
    }

    if (currentValidation.ok) {
      onChange(printSizeFieldsValueFromPrint(currentValidation.print, unit));
      return;
    }

    onChange({ ...value, unit });
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/35 p-3" data-testid={`${testIdPrefix}-fields`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="size-4 text-primary" />
            {title}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <div className="grid w-full grid-cols-2 gap-1 rounded-lg border bg-background p-1 sm:w-32" role="group" aria-label="Print size unit">
          {(["in", "cm"] as const).map((unit) => (
            <Button
              aria-pressed={value.unit === unit}
              className={cn("h-8 rounded-md px-2 text-sm", value.unit === unit && "shadow-sm")}
              disabled={disabled}
              key={unit}
              onClick={() => changeUnit(unit)}
              type="button"
              variant={value.unit === unit ? "default" : "ghost"}
            >
              {unit}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${testIdPrefix}-width`}>Width ({value.unit})</Label>
          <Input
            aria-invalid={!currentValidation.ok}
            data-testid={`${testIdPrefix}-width`}
            disabled={disabled}
            id={`${testIdPrefix}-width`}
            inputMode="decimal"
            max={max}
            min={min}
            onChange={(event) => onChange({ ...value, width: event.target.value })}
            step={PRINT_SIZE_FIELD_STEP}
            type="number"
            value={value.width}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${testIdPrefix}-height`}>Height ({value.unit})</Label>
          <Input
            aria-invalid={!currentValidation.ok}
            data-testid={`${testIdPrefix}-height`}
            disabled={disabled}
            id={`${testIdPrefix}-height`}
            inputMode="decimal"
            max={max}
            min={min}
            onChange={(event) => onChange({ ...value, height: event.target.value })}
            step={PRINT_SIZE_FIELD_STEP}
            type="number"
            value={value.height}
          />
        </div>
      </div>

      {currentValidation.ok ? (
        <dl className="grid gap-2 rounded-md bg-background/70 p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-semibold text-foreground">Size</dt>
          <dd className="text-muted-foreground" data-testid={`${testIdPrefix}-label`}>
            {formatPreviewBundlePrintDimensions(currentValidation.print)}
          </dd>
          <dt className="font-semibold text-foreground">Area</dt>
          <dd className="text-muted-foreground" data-testid={`${testIdPrefix}-area`}>
            {formatPreviewBundlePrintArea(currentValidation.print)}
          </dd>
        </dl>
      ) : (
        <Alert>
          <AlertDescription>
            {currentValidation.reason} Use {unitLabel} between {min} and {max}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
