package com.norte.labtarget;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * App de teste do impacto I-25, de outro UID que o laboratorio.
 *
 * Liga na propria janela a protecao contra sobreposicoes de terceiros
 * (setHideOverlayWindows, API 31+), para medir se a tela de interrupcao do
 * laboratorio ainda aparece por cima. Nao faz mais nada.
 */
public class MainActivity extends Activity {

  private boolean protegida = true;
  private TextView estado;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER);
    root.setBackgroundColor(Color.parseColor("#0B2239"));
    root.setPadding(64, 64, 64, 64);

    TextView titulo = new TextView(this);
    titulo.setText("Alvo do laboratorio");
    titulo.setTextSize(28);
    titulo.setTextColor(Color.WHITE);
    titulo.setGravity(Gravity.CENTER);
    root.addView(titulo);

    estado = new TextView(this);
    estado.setTextSize(20);
    estado.setTextColor(Color.parseColor("#7FD4FF"));
    estado.setGravity(Gravity.CENTER);
    estado.setPadding(0, 48, 0, 48);
    root.addView(estado);

    Button botao = new Button(this);
    botao.setText("Alternar protecao");
    botao.setOnClickListener(v -> aplicar(!protegida));
    root.addView(botao);

    setContentView(root);
    aplicar(true);
  }

  private void aplicar(boolean valor) {
    protegida = valor;
    getWindow().setHideOverlayWindows(valor);
    estado.setText(valor
        ? "PROTEGIDA\nsetHideOverlayWindows(true)"
        : "DESPROTEGIDA\nsetHideOverlayWindows(false)");
  }
}
