package com.local.weeklyjournal;

import android.app.Activity;
import android.app.AlertDialog;
import android.view.ContextThemeWrapper;
import android.view.LayoutInflater;
import android.widget.TimePicker;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Locale;

@CapacitorPlugin(name = "Journal")
public class JournalPlugin extends Plugin {
    @PluginMethod
    public void exportJson(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "calendar-backup.json"));
        startActivityForResult(call, intent, "exportResult");
    }

    @ActivityCallback
    private void exportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject response = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            if (stream == null) throw new java.io.IOException("저장 위치를 열 수 없습니다.");
            stream.write(call.getString("data", "{}").getBytes(StandardCharsets.UTF_8));
            response.put("cancelled", false);
            call.resolve(response);
        } catch (Exception e) {
            call.reject("백업 파일 저장 실패", e);
        }
    }

    @PluginMethod
    public void pickTime(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Calendar now = Calendar.getInstance();
            boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
            ContextThemeWrapper context = new ContextThemeWrapper(getActivity(),
                dark ? android.R.style.Theme_Material_Dialog_Alert : android.R.style.Theme_Material_Light_Dialog_Alert);
            TimePicker picker = (TimePicker) LayoutInflater.from(context).inflate(R.layout.journal_time_picker, null);
            picker.setIs24HourView(false);
            picker.setHour(now.get(Calendar.HOUR_OF_DAY));
            picker.setMinute(now.get(Calendar.MINUTE));
            AlertDialog dialog = new AlertDialog.Builder(context)
                .setTitle("시간 선택")
                .setView(picker)
                .setNegativeButton("취소", (d, which) -> call.resolve(new JSObject()))
                .setPositiveButton("추가", (d, which) -> {
                    picker.clearFocus();
                    JSObject response = new JSObject();
                    // The wheel uses AM/PM, while notes retain the unambiguous 24-hour format.
                    response.put("time", String.format(Locale.ROOT, "%02d:%02d", picker.getHour(), picker.getMinute()));
                    call.resolve(response);
                }).create();
            dialog.setOnCancelListener(d -> call.resolve(new JSObject()));
            dialog.show();
        });
    }
}
