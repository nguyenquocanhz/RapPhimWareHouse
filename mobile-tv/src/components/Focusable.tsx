import React, { useCallback, useState } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

/**
 * Bo boc Pressable cho dieu khien tu xa (D-pad). Tren tivi, dieu quan trong nhat la
 * o dang chon PHAI NHIN THAY RO - nen component nay theo doi trang thai focus va cho
 * phia goi ve style/children theo focus de phong to + vien do.
 *
 * style va children deu nhan mot ham (focused) => ... de doi giao dien khi duoc chon.
 */
type Child = React.ReactNode | ((focused: boolean) => React.ReactNode);

export interface FocusableProps extends Omit<PressableProps, "children" | "style"> {
  style?: StyleProp<ViewStyle> | ((focused: boolean) => StyleProp<ViewStyle>);
  children?: Child;
}

export function Focusable({ style, children, onFocus, onBlur, ...rest }: FocusableProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback<NonNullable<PressableProps["onFocus"]>>(
    (e) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );
  const handleBlur = useCallback<NonNullable<PressableProps["onBlur"]>>(
    (e) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  return (
    <Pressable
      {...rest}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={typeof style === "function" ? style(focused) : style}
    >
      {typeof children === "function" ? children(focused) : children}
    </Pressable>
  );
}
