//  Systeme expert de diagnostic reseau (fibre optique)
 

#include <stdio.h>
#include <stdlib.h>

typedef struct {
    double signal_dB;   /* niveau de signal en dB */
    double taux_erreur; /* taux d'erreur en pourcentage (%), ex: 6.5 = 6.5% */
    double temperature; /* temperature de l'equipement en degres Celsius */
} Releve;

const double SEUIL_SIGNAL     = 90.0;  /* dB  */
const double SEUIL_ERREUR     = 5.0;   /* %   */
const double SEUIL_TEMP       = 70.0;  /* °C  */

/* Execute le diagnostic sur une releve et affiche le(s) verdict(s) */
void diagnostiquer(Releve r) {
    int anomalie = 0;

    printf("\n");
    printf("Releve : signal = %.2f dB | erreur = %.2f%% | temperature = %.2f°C\n",
           r.signal_dB, r.taux_erreur, r.temperature);
    printf("\n");

    /* Regle R1 : coupe de fibre optique (independante des autres) */
    if (r.signal_dB < SEUIL_SIGNAL) {
        printf("[ALARME] Suspicion de coupure de la fibre optique (signal < %.0f dB).\n",
               SEUIL_SIGNAL);
        anomalie = 1;
    }

    /* Regle R2 : surchauffe (prioritaire sur la regle R3) */
    if (r.taux_erreur > SEUIL_ERREUR && r.temperature > SEUIL_TEMP) {
        printf("[ALARME] Suspicion de surchauffe de l'equipement (erreur > %.0f%% et T > %.0f°C).\n",
               SEUIL_ERREUR, SEUIL_TEMP);
        anomalie = 1;
    }
    /* Regle R3 : interference ou congestion (erreur excessive sans surchauffe) */
    else if (r.taux_erreur > SEUIL_ERREUR) {
        printf("[ALERTE] Suspicion d'interference ou de congestion de lien (erreur > %.0f%%).\n",
               SEUIL_ERREUR);
        anomalie = 1;
    }
    /* Regle R4 : simple alerte de surveillance (chaleur sans erreur excessive) */
    else if (r.temperature > SEUIL_TEMP) {
        printf("[INFO]   Simple alerte de surveillance (T > %.0f°C sans erreur excessive).\n",
               SEUIL_TEMP);
        anomalie = 1;
    }

    /* Regle R5 : aucune anomalie */
    if (!anomalie) {
        printf("[OK]     Aucune anomalie detectee.\n");
    }

    printf("\n");
}

/* Saisie interactive d'une releve */
Releve saisir_releve(void) {
    Releve r;
    printf("Niveau de signal (dB)        : ");
    scanf("%lf", &r.signal_dB);
    printf("Taux d'erreur (%%):             ");
    scanf("%lf", &r.taux_erreur);
    printf("Temperature (°C)             : ");
    scanf("%lf", &r.temperature);
    return r;
}

int main(void) {
    int choix;
    int index;

    printf("\n");
    printf("  SYSTEME EXPERT DE DIAGNOSTIC MAINTENANCIER\n");
    printf("\n\n");

    /* 1. Tests automatiques / demonstration */
    Releve exemples[] = {
        { 80.0, 2.0, 40.0 },  /* R1 : coupure de fibre */
        { 95.0, 8.5, 85.0 },  /* R2 : surchauffe */
        { 95.0, 7.2, 55.0 },  /* R3 : interference / congestion */
        { 95.0, 2.5, 82.0 },  /* R4 : simple alerte de surveillance */
        { 95.0, 3.0, 40.0 },  /* R5 : aucune anomalie */
    };
    int nb_exemples = (int)(sizeof(exemples) / sizeof(exemples[0]));

    printf(" Demonstration sur cas types \n");
    for (index = 0; index < nb_exemples; index++) {
        diagnostiquer(exemples[index]);
    }

    /* 2. Mode interactif */
    printf(" Saisie interactive \n");
    do {
        printf("Voulez-vous tester une nouvelle releve ? (1 = oui, 0 = non) : ");
        scanf("%d", &choix);
        if (choix == 1) {
            Releve r = saisir_releve();
            diagnostiquer(r);
        }
    } while (choix == 1);

    printf("Fin du diagnostic. Merci.\n");
    return EXIT_SUCCESS;
}