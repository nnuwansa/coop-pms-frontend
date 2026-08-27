"use client"

import * as React from "react"
import {format} from "date-fns"
import {CalendarIcon, X} from "lucide-react"
import {DateRange} from "react-day-picker"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Calendar} from "@/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"

interface DatePickerWithRangeProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    date: DateRange | undefined
    onChange: (range: DateRange | undefined) => void
}

export function DatePickerWithRange({
                                        className,
                                        date,
                                        onChange,
                                    }: DatePickerWithRangeProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <div className="relative">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal pr-8",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4"/>
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "yyyy/MM/dd")} -{" "}
                                        {format(date.to, "yyyy/MM/dd")}
                                    </>
                                ) : (
                                    format(date.from, "yyyy/MM/dd")
                                )
                            ) : (
                                <span className="text-gray-500 dark:text-gray-400">Pick a date-range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={onChange}
                            numberOfMonths={1}
                        />
                    </PopoverContent>
                </Popover>
                {date?.from && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => onChange(undefined)}
                    >
                        <X className="h-4 w-4"/>
                    </Button>
                )}
            </div>
        </div>
    )
}