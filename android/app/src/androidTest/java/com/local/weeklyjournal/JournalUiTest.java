package com.local.weeklyjournal;

import static org.junit.Assert.*;
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.Espresso.pressBack;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;

import android.app.Instrumentation;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.widget.TimePicker;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class JournalUiTest {
    private String js(ActivityScenario<MainActivity> scenario, String code) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(code, value -> {result.set(value);latch.countDown();}));
        assertTrue("WebView JS callback timed out", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void ready(ActivityScenario<MainActivity> scenario) throws Exception {
        for (int i=0;i<60;i++) {
            if ("7".equals(js(scenario,"document.querySelectorAll('.entry').length"))) return;
            SystemClock.sleep(250);
        }
        fail("App did not render seven days; startup bridge failure");
    }
    private void tap(ActivityScenario<MainActivity> scenario, String selector) throws Exception {
        String encoded=js(scenario,"JSON.stringify((()=>{const r=document.querySelector("+JSONObject.quote(selector)+").getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,window.innerWidth]})())");
        String decoded = new JSONArray("["+encoded+"]").getString(0);
        JSONArray pos=new JSONArray(decoded);
        float[] xy=new float[2];
        scenario.onActivity(a->{int[] loc=new int[2];a.getBridge().getWebView().getLocationOnScreen(loc);try{float scale=(float)(a.getBridge().getWebView().getWidth()/pos.getDouble(2));xy[0]=loc[0]+(float)pos.getDouble(0)*scale;xy[1]=loc[1]+(float)pos.getDouble(1)*scale;}catch(Exception e){throw new RuntimeException(e);}});
        Instrumentation inst=InstrumentationRegistry.getInstrumentation();long t=SystemClock.uptimeMillis();
        MotionEvent down=MotionEvent.obtain(t,t,MotionEvent.ACTION_DOWN,xy[0],xy[1],0);
        MotionEvent up=MotionEvent.obtain(t,t+80,MotionEvent.ACTION_UP,xy[0],xy[1],0);
        inst.sendPointerSync(down);inst.sendPointerSync(up);down.recycle();up.recycle();inst.waitForIdleSync();SystemClock.sleep(250);
    }
    private void screenshot(String name) throws Exception {
        Instrumentation inst=InstrumentationRegistry.getInstrumentation();
        // Gradle uninstalls the tested app after the suite; shared Downloads survives cleanup.
        for (String command : new String[]{"mkdir -p /sdcard/Download/calendar-ui", "screencap -p /sdcard/Download/calendar-ui/"+name+".png"}) {
            try (android.os.ParcelFileDescriptor fd=inst.getUiAutomation().executeShellCommand(command);
                 java.io.FileInputStream input=new java.io.FileInputStream(fd.getFileDescriptor())) {
                byte[] buffer=new byte[1024];while(input.read(buffer)!=-1) { }
            }
        }
    }
    @Test
    public void android16LaunchEditSaveSettingsAndTimePicker() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            assertEquals("true",js(scenario,"typeof Capacitor.Plugins.Journal.pickTime==='function'"));
            screenshot("01-week-empty");
            tap(scenario,".entry");
            assertEquals("false",js(scenario,"document.querySelector('#editor').classList.contains('hidden')"));
            String note="11:50\n[코스트코]\n치즈피자 1조각\n밥 150\n참치김치찌개\n19:10\n닭가슴살\n사과";
            js(scenario,"document.querySelector('#note').value="+JSONObject.quote(note)+";document.querySelector('#note').dispatchEvent(new Event('input'))");
            tap(scenario,"#note");
            java.util.concurrent.atomic.AtomicBoolean keyboard = new java.util.concurrent.atomic.AtomicBoolean();
            for (int i=0; i<40 && !keyboard.get(); i++) {
                scenario.onActivity(a -> {
                    androidx.core.view.WindowInsetsCompat insets = androidx.core.view.ViewCompat.getRootWindowInsets(a.getBridge().getWebView());
                    keyboard.set(insets != null && insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime()));
                });
                SystemClock.sleep(250);
            }
            assertTrue("Soft keyboard must actually be visible", keyboard.get());
            SystemClock.sleep(500);
            assertEquals("true",js(scenario,"(()=>{const t=document.querySelector('#note').getBoundingClientRect(),s=document.querySelector('#save').getBoundingClientRect();return t.height>=60 && t.bottom<=s.top && s.bottom<=innerHeight})()"));
            scenario.onActivity(a -> {
                android.view.View web = a.getBridge().getWebView();
                int[] location = new int[2];web.getLocationOnScreen(location);
                androidx.core.view.WindowInsetsCompat insets = androidx.core.view.ViewCompat.getRootWindowInsets(web);
                int keyboardTop = a.getWindow().getDecorView().getHeight() - insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom;
                assertTrue("WebView must end above keyboard", location[1]+web.getHeight()<=keyboardTop+2);
            });
            screenshot("06-editor-keyboard");
            tap(scenario,"#save");
            assertEquals("\"Hmm...\"",js(scenario,"document.querySelector('.entry .grade').textContent"));
            assertEquals("true",js(scenario,"document.querySelector('.entry pre').textContent.includes('찌개\\n\\n19:10')"));
            screenshot("02-week-saved");
            tap(scenario,".entry");tap(scenario,"#edit-next");tap(scenario,"#edit-prev");
            assertEquals("true",js(scenario,"document.querySelector('#note').value.includes('닭가슴살')"));
            tap(scenario,"#insert-time");
            onView(isAssignableFrom(TimePicker.class)).check(matches(isDisplayed()));
            screenshot("03-native-time-picker");pressBack();
            tap(scenario,"#close");tap(scenario,"[data-tab=settings]");
            js(scenario,"document.querySelector('#theme').value='dark';document.querySelector('#theme').dispatchEvent(new Event('change'))");
            assertEquals("\"dark\"",js(scenario,"document.body.dataset.theme"));
            screenshot("04-settings-dark");
            tap(scenario,"[data-tab=week]");screenshot("05-week-dark");
            // Recreate the actual Android Activity, ensuring saved records and theme survive.
            scenario.recreate();ready(scenario);
            assertEquals("\"dark\"",js(scenario,"document.body.dataset.theme"));
            assertEquals("true",js(scenario,"document.querySelector('.entry pre').textContent.includes('닭가슴살')"));
        }
    }
}
