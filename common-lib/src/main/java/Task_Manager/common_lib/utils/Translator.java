package Task_Manager.common_lib.utils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class Translator {

    private static MessageSource messageSource;

    @Autowired
    public void setMessageSource(MessageSource messageSource) {
        Translator.messageSource = messageSource;
    }

    public static String toLocale(String msgCode) {
        return toLocale(msgCode, (Object[]) null);
    }

    public static String toLocale(String msgCode, Object... args) {
        if (messageSource == null) {
            return msgCode;
        }
        Locale locale = LocaleContextHolder.getLocale();
        try {
            return messageSource.getMessage(msgCode, args, msgCode, locale);
        } catch (Exception e) {
            return msgCode;
        }
    }
}